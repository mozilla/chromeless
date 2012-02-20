#!/bin/bash

# extract any file, just call `extract filename`
extract () {
    if [ -f $1 ] ; then
        case $1 in
            *.tar.bz2) tar xjf $1 ;;
            *.tar.gz) tar xzf $1 ;;
            *.bz2) bunzip2 $1 ;;
            *.rar) rar x $1 ;;
            *.gz) gunzip $1 ;;
            *.tar) tar xf $1 ;;
            *.tbz2) tar xjf $1 ;;
            *.tgz) tar xzf $1 ;;
            *.zip) unzip $1 ;;
            *.z) uncompress $1 ;;
            *) echo "unrecognized file extension: '$1'" ;;
        esac
    else
        echo "argument is not a file: '$1'"
    fi
}

err_exit() {
    echo "$1" >&2
    exit
}

#downloads all files to current working dir
download_version() {
    if [[ "x$1" == "x" ]]; then
        err_exit "Please specify the version to download"
        return
    fi
    
    #set variables and download urls
    version="$1"
    dl_root="http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/$version"
    urls=("$dl_root/runtimes/xulrunner-$version.en-US.linux-x86_64.tar.bz2" "$dl_root/runtimes/xulrunner-$version.en-US.linux-i686.tar.bz2" "$dl_root/runtimes/xulrunner-$version.en-US.win32.zip" "$dl_root/sdk/xulrunner-$version.en-US.mac-x86_64.sdk.tar.bz2" "$dl_root/sdk/xulrunner-$version.en-US.mac-i386.sdk.tar.bz2")
    
    #now we download them
    for url in ${urls[*]}
    do
        wget "$url"
    done
}

mdsum() {
    md5sum "$1"|awk '{print $1}'
}

#creates md5s
create_pkg_md5() {
    if [[ "x$1" == "x" ]]; then
        err_exit "Please specify the version to use"
        return
    fi
    
    #echo "':'$PWD;"
    #set variables and download urls
    version="$1"
    dl_root="http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/$version"
    
    #all files, names, urls
    names=('"Linux_64bit"' '"Darwin_64bit"' '"Darwin_32bit"' '("Windows_32bit", "Windows_64bit")"' '"Linux_32bit"')
    files=("xulrunner-$version.en-US.linux-x86_64.tar.bz2" "xulrunner-$version.en-US.mac-x86_64.sdk.tar.bz2" "xulrunner-$version.en-US.mac-i386.sdk.tar.bz2" "xulrunner-$version.en-US.win32.zip" "xulrunner-$version.en-US.linux-i686.tar.bz2")
    urlPrefixes=("runtime" "sdk" "sdk" "runtime" "runtime")
    exes=("xulrunner/xulrunner" "xulrunner-sdk/bin/xulrunner-bin" "xulrunner-sdk/bin/xulrunner-bin" "xulrunner/xulrunner.exe" "xulrunner/xulrunner")
    
    #output config file
    echo "software = {"
    
    #loop over all files
    for (( i=0; i<${#urlPrefixes[*]}; i++ ));
    do
        type="${names[$i]}"
        fname="${files[$i]}"
        url="$dl_root/${urlPrefixes[$i]}/$fname"
        exename="${exes[$i]}"
        
        #extract if not extracted
        if [[ ! -d "$fname.dir" ]]
        then
            mkdir "$fname.dir"
            cd "$fname.dir"
            extract "../$fname"
        fi
        
        #mdsum
        md=$(mdsum "../$fname")
        mdexe=$(mdsum "$exename")
        
        #clean up
        cd ../
  #      rm -rf "$fname.dir"
        
        #output script
        cat <<endl
    $type: {
       "url": "$url",
       "md5": "$md",
       "bin": {
           "path": "$exename",
           "sig": "$mdexe"
       }
    }
endl
    
    
    done
}

tesfsfsfsft(){
for file in *.zip :
do
    echo $file
    mkdir $file.dir
    cd $file.dir
    extract ../$file
    echo "----"
    [[ -e xulrunner/xulrunner ]] && md5sum xulrunner/xulrunner
    [[ -e xulrunner/xulrunner.exe ]] && md5sum xulrunner/xulrunner.exe
    [[ -e xulrunner-sdk/bin/xulrunner-bin ]] && md5sum xulrunner-sdk/bin/xulrunner-bin
    echo "---"
    cd ../
    rm -rf $file.dir
done

}

if [[ "x$1" == "x" ]]; then
    err_exit "Please specify the version to download. ex: '$0 10.0.2'"
fi

xulversion="$1"
dldirectory="xulversions"

#have we run recently, and therfore the directory exists and has files in it?
if [[ -d "$dldirectory" && "$(ls -A "$dldirectory")" ]]; then

    #keep running until valid input
    invalid=true
    while [[ $invalid == true ]]; do
    
        read -p "'$dldirectory' has files in it. [D]elete, [a]rchive, or [u]se? " -n 1 result
        echo "" # new line
        case "$result" in
            #delete
            ""|d|D)
                rm -rf "$dldirectory"
                echo "Deleted!"
                
                mkdir "$dldirectory"
                invalid=false
                
                cd "$dldirectory"
                download_version "$xulversion"
                ;;
            #archive
            a|A)
                mv "$dldirectory" "$dldirectory.`date`"
                echo "Moved!"
                
                mkdir "$dldirectory"
                invalid=false
                
                cd "$dldirectory"
                download_version "$xulversion"
                ;;
            #use
            u|U)
                echo "Using..."
                invalid=false
                ;;
        esac
    done
else
    echo "No prior runs, downloading..." 
    [[ -d "$dldirectory" ]] || mkdir "$dldirectory" # make directory if not exist
    cd "$dldirectory"
    download_version "$xulversion"
fi
cd "$dldirectory"
create_pkg_md5 "$xulversion"

echo "done!"
